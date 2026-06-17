import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Portafolio } from './portafolio';

describe('Portafolio', () => {
  let component: Portafolio;
  let fixture: ComponentFixture<Portafolio>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Portafolio],
    }).compileComponents();

    fixture = TestBed.createComponent(Portafolio);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
