import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InformacionCarrera } from './informacion-carrera';

describe('InformacionCarrera', () => {
  let component: InformacionCarrera;
  let fixture: ComponentFixture<InformacionCarrera>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InformacionCarrera],
    }).compileComponents();

    fixture = TestBed.createComponent(InformacionCarrera);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
