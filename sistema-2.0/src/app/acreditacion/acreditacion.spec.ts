import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Acreditacion } from './acreditacion';

describe('Acreditacion', () => {
  let component: Acreditacion;
  let fixture: ComponentFixture<Acreditacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Acreditacion],
    }).compileComponents();

    fixture = TestBed.createComponent(Acreditacion);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
